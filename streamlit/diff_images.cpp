#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <vector>
#include <tuple>
#include <cmath>
#include <omp.h>  // додано
#include <thread>  // додано

using namespace std;

namespace py = pybind11;


// Nearest-neighbor resize on flat RGB bytes
py::bytes resize_nn_bytes(py::bytes src, int orig_w, int orig_h, int new_w, int new_h) {
    std::string s = src;
    const size_t in_len = s.size();
    const size_t expected = static_cast<size_t>(orig_w) * static_cast<size_t>(orig_h) * 3u;
    if (in_len != expected) throw std::runtime_error("resize_nn_bytes: input size mismatch");

    std::string out;
    out.resize(static_cast<size_t>(new_w) * static_cast<size_t>(new_h) * 3u);

    const uint8_t* p = reinterpret_cast<const uint8_t*>(s.data());
    uint8_t* po = reinterpret_cast<uint8_t*>(&out[0]);

    for (int y = 0; y < new_h; ++y) {
        int orig_y = (y * orig_h) / new_h;
        for (int x = 0; x < new_w; ++x) {
            int orig_x = (x * orig_w) / new_w;
            size_t src_idx = (static_cast<size_t>(orig_y) * orig_w + orig_x) * 3u;
            size_t dst_idx = (static_cast<size_t>(y) * new_w + x) * 3u;
            po[dst_idx + 0] = p[src_idx + 0];
            po[dst_idx + 1] = p[src_idx + 1];
            po[dst_idx + 2] = p[src_idx + 2];
        }
    }
    return py::bytes(out);
}


// Diff on flat RGB bytes;
py::bytes diff_images_bytes(py::bytes rgb1, py::bytes rgb2, int w, int h, float threshold) {
    std::string s1 = rgb1;
    std::string s2 = rgb2;
    const size_t n = static_cast<size_t>(w) * static_cast<size_t>(h) * 3u;
    if (s1.size() != n || s2.size() != n) throw std::runtime_error("diff_images_bytes: input size mismatch");

    std::string out;
    out.resize(n);

    const uint8_t* p1 = reinterpret_cast<const uint8_t*>(s1.data());
    const uint8_t* p2 = reinterpret_cast<const uint8_t*>(s2.data());
    uint8_t* po = reinterpret_cast<uint8_t*>(&out[0]);

    const float thr2 = threshold * threshold;

    for (size_t i = 0; i < n; i += 3) {
        int r1 = p1[i + 0], g1 = p1[i + 1], b1 = p1[i + 2];
        int r2 = p2[i + 0], g2 = p2[i + 1], b2 = p2[i + 2];

        int dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
        float dist2 = float(dr * dr + dg * dg + db * db);

        if (dist2 > thr2) {
        // if (dist2 >= thr2) {
            int sum1 = r1 + g1 + b1;
            int sum2 = r2 + g2 + b2;
            if (sum1 > sum2) {
                po[i + 0] = 255; po[i + 1] = 0;   po[i + 2] = 0;
            } else {
                po[i + 0] = 0;   po[i + 1] = 0;   po[i + 2] = 255;
            }
        } else {
            po[i + 0] = static_cast<uint8_t>(r1);
            po[i + 1] = static_cast<uint8_t>(g1);
            po[i + 2] = static_cast<uint8_t>(b1);
        }
    }
    return py::bytes(out);
}



// py::bytes diff_images_bytes_omp(py::bytes rgb1, py::bytes rgb2, int w, int h, float threshold) {
//     // Конвертації ПІД GIL
//     std::string s1 = rgb1;
//     std::string s2 = rgb2;
//     const size_t n = static_cast<size_t>(w) * static_cast<size_t>(h) * 3u;
//     if (s1.size() != n || s2.size() != n) throw std::runtime_error("diff_images_bytes: input size mismatch");

//     std::string out;
//     out.resize(n);

//     const uint8_t* p1 = reinterpret_cast<const uint8_t*>(s1.data());
//     const uint8_t* p2 = reinterpret_cast<const uint8_t*>(s2.data());
//     uint8_t* po = reinterpret_cast<uint8_t*>(&out[0]);

//     const float thr2 = threshold * threshold;
//     const size_t pixels = n / 3u;

//     { // Важкі обчислення БЕЗ GIL
//         py::gil_scoped_release release;

//         #pragma omp parallel for schedule(static)
//         for (long long j = 0; j < static_cast<long long>(pixels); ++j) {
//             size_t i = static_cast<size_t>(j) * 3u;

//             int r1 = p1[i + 0], g1 = p1[i + 1], b1 = p1[i + 2];
//             int r2 = p2[i + 0], g2 = p2[i + 1], b2 = p2[i + 2];

//             int dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
//             float dist2 = float(dr * dr + dg * dg + db * db);

//             if (dist2 > thr2) {
//                 int sum1 = r1 + g1 + b1;
//                 int sum2 = r2 + g2 + b2;
//                 if (sum1 > sum2) {
//                     po[i + 0] = 255; po[i + 1] = 0;   po[i + 2] = 0;
//                 } else {
//                     po[i + 0] = 0;   po[i + 1] = 0;   po[i + 2] = 255;
//                 }
//             } else {
//                 po[i + 0] = static_cast<uint8_t>(r1);
//                 po[i + 1] = static_cast<uint8_t>(g1);
//                 po[i + 2] = static_cast<uint8_t>(b1);
//             }
//         }
//     } // GIL відновлено

//     return py::bytes(out);
// }



// py::bytes diff_images_bytes_thread(py::bytes rgb1, py::bytes rgb2, int w, int h, float threshold) {
//     // Конвертація Python bytes -> C++ буфери ПІД GIL
//     std::string s1 = rgb1;
//     std::string s2 = rgb2;
//     const size_t n = static_cast<size_t>(w) * static_cast<size_t>(h) * 3u;
//     if (s1.size() != n || s2.size() != n) throw std::runtime_error("diff_images_bytes: input size mismatch");

//     std::string out;
//     out.resize(n);

//     const uint8_t* p1 = reinterpret_cast<const uint8_t*>(s1.data());
//     const uint8_t* p2 = reinterpret_cast<const uint8_t*>(s2.data());
//     uint8_t* po = reinterpret_cast<uint8_t*>(&out[0]);

//     const float thr2 = threshold * threshold;
//     const size_t pixels = n / 3u;

//     { // Важкі обчислення БЕЗ GIL
//         py::gil_scoped_release release;

//         auto worker = [p1, p2, po, thr2](size_t start_px, size_t end_px) {
//             for (size_t j = start_px; j < end_px; ++j) {
//                 const size_t i = j * 3u;

//                 int r1 = p1[i + 0], g1 = p1[i + 1], b1 = p1[i + 2];
//                 int r2 = p2[i + 0], g2 = p2[i + 1], b2 = p2[i + 2];

//                 int dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
//                 float dist2 = float(dr * dr + dg * dg + db * db);

//                 if (dist2 > thr2) {
//                     int sum1 = r1 + g1 + b1;
//                     int sum2 = r2 + g2 + b2;
//                     if (sum1 > sum2) {
//                         po[i + 0] = 255; po[i + 1] = 0;   po[i + 2] = 0;
//                     } else {
//                         po[i + 0] = 0;   po[i + 1] = 0;   po[i + 2] = 255;
//                     }
//                 } else {
//                     po[i + 0] = static_cast<uint8_t>(r1);
//                     po[i + 1] = static_cast<uint8_t>(g1);
//                     po[i + 2] = static_cast<uint8_t>(b1);
//                 }
//             }
//         };

//         unsigned tc = std::thread::hardware_concurrency();
//         if (tc == 0) tc = 4;
//         tc = std::min<unsigned>(tc, static_cast<unsigned>(pixels));

//         std::vector<std::thread> threads;
//         threads.reserve(tc);
//         for (unsigned t = 0; t < tc; ++t) {
//             size_t start_px = pixels * t / tc;
//             size_t end_px   = pixels * (t + 1) / tc;
//             threads.emplace_back(worker, start_px, end_px);
//         }
//         for (auto& th : threads) th.join();
//     } // Тут GIL вже відновлено

//     // Створення Python bytes ПІД GIL
//     return py::bytes(out);
// }


PYBIND11_MODULE(diff_images_cpp, m) {
    m.def("resize_nn_bytes", &resize_nn_bytes);
    m.def("diff_images_bytes", &diff_images_bytes);
    // m.def("diff_images_bytes_omp", &diff_images_bytes_omp);
    // m.def("diff_images_bytes_thread", &diff_images_bytes_thread);
}